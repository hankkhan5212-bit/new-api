package service

import (
	"strings"

	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
)

// GetUserUsableGroups 返回用户可选的分组列表（用于令牌创建时选择分组）。
// userGroups 为用户所属的全部 group 列表（支持多分组）。
func GetUserUsableGroups(userGroups []string) map[string]string {
	groupsCopy := setting.GetUserUsableGroupsCopy()
	if len(userGroups) == 0 {
		return groupsCopy
	}
	// 遍历所有用户分组，合并可用分组
	for _, userGroup := range userGroups {
		if userGroup == "" {
			continue
		}
		specialSettings, b := ratio_setting.GetGroupRatioSetting().GroupSpecialUsableGroup.Get(userGroup)
		if b {
			for specialGroup, desc := range specialSettings {
				if strings.HasPrefix(specialGroup, "-:") {
					groupToRemove := strings.TrimPrefix(specialGroup, "-:")
					delete(groupsCopy, groupToRemove)
				} else if strings.HasPrefix(specialGroup, "+:") {
					groupToAdd := strings.TrimPrefix(specialGroup, "+:")
					groupsCopy[groupToAdd] = desc
				} else {
					groupsCopy[specialGroup] = desc
				}
			}
		}
		// 如果该用户分组不在UserUsableGroups中，自动添加
		if _, ok := groupsCopy[userGroup]; !ok {
			groupsCopy[userGroup] = "用户分组"
		}
	}
	return groupsCopy
}

// GetUserUsableGroupsLegacy 兼容旧的单分组调用。
func GetUserUsableGroupsLegacy(userGroup string) map[string]string {
	if userGroup == "" {
		return GetUserUsableGroups(nil)
	}
	return GetUserUsableGroups([]string{userGroup})
}

func GroupInUserUsableGroups(userGroups []string, groupName string) bool {
	_, ok := GetUserUsableGroups(userGroups)[groupName]
	return ok
}

// GetUserAutoGroup returns the user's own groups as the auto groups list.
// Each user's auto groups are their own assigned groups, no global auto groups config needed.
func GetUserAutoGroup(userGroups []string) []string {
	if len(userGroups) == 0 {
		return []string{}
	}
	result := make([]string, len(userGroups))
	copy(result, userGroups)
	return result
}

// GetUserGroupRatio 获取用户使用某个分组的倍率
// userGroups 用户分组列表
// group 需要获取倍率的分组
func GetUserGroupRatio(userGroups []string, group string) float64 {
	for _, ug := range userGroups {
		ratio, ok := ratio_setting.GetGroupGroupRatio(ug, group)
		if ok {
			return ratio
		}
	}
	return ratio_setting.GetGroupRatio(group)
}
